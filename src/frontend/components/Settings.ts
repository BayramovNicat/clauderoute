import { SettingsService } from "../services/SettingsService";
import { cn, html } from "../utils/dom";
import { type FieldDef, SettingsField } from "./SettingsField";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Toggle } from "./ui/Toggle";

const TOP_FIELDS: FieldDef[] = [
	{
		key: "ANTHROPIC_BASE_URL",
		label: "ANTHROPIC_BASE_URL",
		desc: "The API gateway utilized by Claude Code (e.g. OmniRoute gateway or proxy).",
		type: "text",
		placeholder: "https://api.anthropic.com",
	},
	{
		key: "ANTHROPIC_API_KEY",
		label: "ANTHROPIC_API_KEY",
		desc: "Your OmniRoute authentication key. Hidden by default for privacy.",
		type: "secret",
		placeholder: "sk-ant-...",
	},
];

const MODEL_FIELDS: FieldDef[] = [
	{
		key: "ANTHROPIC_MODEL",
		label: "ANTHROPIC_MODEL",
		desc: "Primary fallback routing model.",
		type: "select",
	},
	{
		key: "ANTHROPIC_DEFAULT_SONNET_MODEL",
		label: "ANTHROPIC_DEFAULT_SONNET_MODEL",
		desc: "Default route model for Claude Sonnet targets.",
		type: "select",
	},
	{
		key: "ANTHROPIC_DEFAULT_OPUS_MODEL",
		label: "ANTHROPIC_DEFAULT_OPUS_MODEL",
		desc: "Default route model for Claude Opus targets.",
		type: "select",
	},
	{
		key: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
		label: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
		desc: "Default route model for Claude Haiku targets.",
		type: "select",
	},
];

export function Settings() {
	const service = new SettingsService();
	const container = html`<div class="w-full max-w-3xl mx-auto px-4 py-8"></div>`;

	let wasLoading = true;

	let notificationToggleRef: HTMLInputElement | null = null;
	let successMessageEl: HTMLDivElement | null = null;
	let errorMessageEl: HTMLDivElement | null = null;
	let saveBtn: HTMLButtonElement | null = null;
	let resetBtn: HTMLButtonElement | null = null;

	function render() {
		if (service.isLoading()) {
			wasLoading = true;
			container.replaceChildren(html`
        <div class="flex flex-col items-center justify-center py-20 gap-y-4">
          <div
            class="w-12 h-12 border-4 border-[#f97316]/30 border-t-[#f97316] rounded-full animate-spin"
          ></div>
          <p class="text-[#77736b] font-medium text-sm animate-pulse">
            Loading Claude environment settings...
          </p>
        </div>
      `);
			return;
		}

		if (wasLoading) {
			wasLoading = false;
			buildFullUI();
		}

		updateDynamicState();
	}

	function buildFullUI() {
		container.innerHTML = "";

		successMessageEl = Alert({ type: "success" });
		errorMessageEl = Alert({ type: "error" });

		saveBtn = Button({
			content: "Save Changes",
			className:
				"px-5 py-2.5 text-sm font-bold rounded-xl border-0 transition-all duration-300 shadow-sm",
			onclick: () => service.save(),
		});

		resetBtn = Button({
			content: "Reset",
			className:
				"px-4 py-2.5 text-sm font-semibold rounded-xl border-0 transition-all duration-300",
			onclick: () => service.reset(),
		});

		const modelOptions = service.getModelOptions();
		const selectOptions = [
			{ value: "", label: "Select a model..." },
			...modelOptions,
		];

		const topFields = TOP_FIELDS.map((def) =>
			SettingsField({ def, service, selectOptions }),
		);
		const modelFields = MODEL_FIELDS.map((def) =>
			SettingsField({ def, service, selectOptions }),
		);

		const notificationsToggle = Toggle({
			id: "desktop-notifications",
			checked: service.getDesktopNotificationsEnabled(),
			onchange: (e) =>
				service.setDesktopNotificationsEnabled(
					(e.target as HTMLInputElement).checked,
				),
		});

		const toggleInput = notificationsToggle.querySelector(
			"input",
		) as HTMLInputElement;
		if (toggleInput) {
			notificationToggleRef = toggleInput;
		}

		const layout = html`
      <div
        class="bg-white/80 backdrop-blur-md rounded-2xl border border-[#e7e1d8] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.04)]"
      >
        <!-- Header block -->
        <div
          class="p-6 border-b border-[#e7e1d8]/60 bg-linear-to-r from-transparent via-[#fcfaf7] to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1
              class="text-2xl font-extrabold tracking-tight bg-linear-to-r from-[#171717] via-[#2c2925] to-[#d15c13] bg-clip-text text-transparent"
            >
              Claude Code Settings
            </h1>
            <p class="text-[#77736b] text-sm mt-1">
              Configure Claude's local environment values and active route
              defaults.
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            ${resetBtn} ${saveBtn}
          </div>
        </div>

        <!-- Alerts inside card -->
        <div class="px-6 pt-6">${successMessageEl} ${errorMessageEl}</div>

        <!-- Form List -->
        <div class="p-6 flex flex-col gap-y-5">
          <!-- Notifications toggle row -->
          <div
            class="flex items-center justify-between p-4 rounded-xl bg-[#faf9f6]/50 border border-[#e7e1d8]/40 hover:bg-[#faf9f6] hover:border-[#e7e1d8]/80 transition-all duration-200 group"
          >
            <div class="flex flex-col gap-y-1">
              ${Label({
								content: "Desktop Notifications",
								htmlFor: "desktop-notifications",
								className: "font-bold text-[#171717] text-sm cursor-pointer",
							})}
              <span class="text-[#77736b] text-[0.82rem] font-medium">
                Trigger local notifications for Claude Code lifecycle events.
              </span>
            </div>
            <div class="shrink-0 flex items-center">${notificationsToggle}</div>
          </div>

          <div class="h-px bg-[#e7e1d8]/60 my-2"></div>

          <!-- Env Vars Fields -->
          <div class="flex flex-col gap-y-5">
            ${topFields}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-2">
              ${modelFields}
            </div>
          </div>
        </div>
      </div>
    `;

		container.appendChild(layout);
	}

	function updateDynamicState() {
		if (!successMessageEl || !errorMessageEl || !saveBtn || !resetBtn) return;

		const isDirty = service.isDirty();
		const isSaving = service.isSaving();
		const errorMsg = service.getErrors();
		const successMsg = service.getSuccessMessage();

		// Update notification toggle
		if (notificationToggleRef) {
			const expectedChecked = service.getDesktopNotificationsEnabled();
			if (notificationToggleRef.checked !== expectedChecked) {
				notificationToggleRef.checked = expectedChecked;
			}
		}

		// Update alerts
		const updateAlert = (el: HTMLDivElement, msg: string) => {
			const textSpan = el.querySelector(".message-text");
			if (textSpan) textSpan.textContent = msg;
			el.style.display = msg ? "flex" : "none";
		};
		updateAlert(successMessageEl, successMsg);
		updateAlert(errorMessageEl, errorMsg);

		// Save Button Classes and Content
		saveBtn.disabled = !isDirty || isSaving;
		if (isSaving) {
			saveBtn.replaceChildren(html`
        <span class="flex items-center gap-2">
          <div
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></div>
          Saving...
        </span>
      `);
		} else {
			saveBtn.replaceChildren(html`<span>Save Changes</span>`);
		}

		saveBtn.className = cn(
			"px-5 py-2.5 text-sm font-bold rounded-xl border-0 transition-all duration-300 shadow-sm",
			isDirty && !isSaving
				? "bg-gradient-to-r from-[#f97316] to-[#d15c13] text-white cursor-pointer hover:shadow-[0_4px_20px_rgba(249,115,22,0.35)] hover:scale-[1.01] active:scale-[0.99]"
				: "bg-[#eae5db] text-[#a19c91] cursor-not-allowed shadow-none",
		);

		// Reset Button Classes
		resetBtn.disabled = !isDirty || isSaving;
		resetBtn.className = cn(
			"px-4 py-2.5 text-sm font-semibold rounded-xl border-0 transition-all duration-300",
			isDirty && !isSaving
				? "text-[#77736b] hover:text-[#171717] hover:bg-[#f3f0ea] cursor-pointer"
				: "text-[#a19c91] cursor-not-allowed",
		);
	}

	service.subscribe(() => render());
	render();

	return container;
}
