import { SettingsService } from "../services/SettingsService";
import { cn, html } from "../utils/dom";
import { type FieldDef, SettingsField } from "./SettingsField";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Label } from "./ui/Label";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { Toggle } from "./ui/Toggle";

const TOP_FIELDS: FieldDef[] = [
  {
    key: "ANTHROPIC_BASE_URL",
    desc: "The API gateway utilized by Claude Code (e.g. OmniRoute gateway or proxy).",
    type: "text",
    placeholder: "https://api.anthropic.com",
  },
  {
    key: "ANTHROPIC_API_KEY",
    desc: "Your OmniRoute authentication key. Hidden by default for privacy.",
    type: "secret",
    placeholder: "sk-ant-...",
  },
];

const MODEL_FIELDS: FieldDef[] = [
  {
    key: "ANTHROPIC_MODEL",
    desc: "Primary fallback routing model.",
    type: "select",
  },
  {
    key: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    desc: "Default route model for Claude Sonnet targets.",
    type: "select",
  },
  {
    key: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    desc: "Default route model for Claude Opus targets.",
    type: "select",
  },
  {
    key: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    desc: "Default route model for Claude Haiku targets.",
    type: "select",
  },
];

export function Settings() {
  const service = new SettingsService();
  const container = html`<div
    class="w-full max-w-3xl mx-auto px-4 py-8"
  ></div>`;

  let wasLoading = true;

  let notificationToggleRef: HTMLInputElement | null = null;
  let successMessageEl: HTMLDivElement | null = null;
  let errorMessageEl: HTMLDivElement | null = null;
  let saveBtn: HTMLButtonElement | null = null;
  let resetBtn: HTMLButtonElement | null = null;

  function render() {
    if (service.isLoading()) {
      wasLoading = true;
      container.replaceChildren(
        LoadingSpinner({ text: "Loading Claude environment settings..." }),
      );
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
      onclick: () => service.save(),
    });

    resetBtn = Button({
      content: "Reset",
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

    const layout = Card({
      className: "hover:shadow-[0_8px_35px_rgb(0,0,0,0.04)]",
      title: "Claude Code Settings",
      description:
        "Configure Claude's local environment values and active route defaults.",
      titleGradientTo: "to-[#d15c13]",
      headerActions: [resetBtn, saveBtn],
      alerts: [successMessageEl, errorMessageEl],
      content: [
        html`
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
        `,
        html`
          <!-- Env Vars Fields -->
          <div class="flex flex-col gap-y-5">
            ${topFields}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-2">
              ${modelFields}
            </div>
          </div>
        `,
      ],
    });

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
