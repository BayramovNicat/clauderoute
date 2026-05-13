import { type Provider, ProvidersService } from "../services/ProvidersService";
import { cn, html } from "../utils/dom";

export function Providers() {
  const service = ProvidersService.getInstance();
  const container = html`<div
    class="w-full max-w-3xl mx-auto px-4 pb-16 mt-6"
  ></div>`;

  function render() {
    const { loading, error, data } = service.getState();

    if (loading) {
      container.innerHTML = /*html*/ `
				<div class="flex flex-col items-center justify-center py-20 gap-y-4">
					<div class="w-12 h-12 border-4 border-[#f97316]/30 border-t-[#f97316] rounded-full animate-spin"></div>
					<p class="text-[#77736b] font-medium text-sm animate-pulse">Loading providers...</p>
				</div>
			`;
      return;
    }

    if (error) {
      container.innerHTML = /*html*/ `
				<div class="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm font-medium">
					Error: ${error}
				</div>
			`;
      return;
    }

    if (
      !data?.providers ||
      !Array.isArray(data.providers) ||
      data.providers.length === 0
    ) {
      container.innerHTML = /*html*/ `
				<div class="flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-md rounded-2xl border border-[#e7e1d8] shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
					<div class="h-16 w-16 bg-[#faf9f6] rounded-full flex items-center justify-center border border-[#e7e1d8]/60 mb-4 text-[#a19c91]">
						<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
					</div>
					<h2 class="text-xl font-bold text-[#171717] tracking-tight">No Active Providers Found</h2>
					<p class="text-[#77736b] text-sm mt-2 max-w-sm leading-relaxed">It looks like there are no active AI providers configured in your OmniRoute account.</p>
				</div>
			`;
      return;
    }

    const listHtml = data.providers.map((p: Provider) => {
      const providerKey = p.provider || p.id;
      const inlineModels = Array.isArray(p.models) ? p.models : [];
      const builtInModels = data.models[providerKey] || [];
      const modelsList = inlineModels.length > 0 ? inlineModels : builtInModels;

      const providerTitle = (p.provider || p.id || "Unknown")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char: string) => char.toUpperCase());

      const emailStr = p.email || p.name || p.account || "No email linked";
      const isActive = p.status === "active" || p.enabled !== false;

      const badgeClass = isActive
        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 shadow-[0_2px_8px_rgba(16,185,129,0.03)]"
        : "bg-rose-500/10 text-rose-600 border border-rose-500/25 shadow-[0_2px_8px_rgba(244,63,94,0.03)]";
      const dotClass = isActive
        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
        : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse";

      return html`
        <div
          class="flex flex-col p-5 rounded-2xl border border-[#e7e1d8]/40 bg-[#faf9f6]/20 hover:bg-[#faf9f6]/40 hover:border-[#e7e1d8]/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.01)] transition-all duration-300"
        >
          <!-- Provider Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex flex-col gap-y-1 min-w-0">
              <h3
                class="text-base font-extrabold text-[#171717] tracking-tight truncate"
              >
                ${providerTitle}
              </h3>
              <span
                class="text-[#77736b] text-xs font-semibold truncate flex items-center gap-1.5"
              >
                <svg
                  class="h-3.5 w-3.5 shrink-0 opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
                ${emailStr}
              </span>
            </div>
            <div class="flex items-center shrink-0">
              <div
                class="${cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold select-none",
                  badgeClass,
                )}"
              >
                <span
                  class="${cn("h-1.5 w-1.5 rounded-full", dotClass)}"
                ></span>
                ${isActive ? "Active" : "Disabled"}
              </div>
            </div>
          </div>

          <div class="h-px bg-[#e7e1d8]/30 my-4"></div>

          <!-- Models Section -->
          <div class="flex flex-col gap-y-2">
            <span
              class="text-[0.68rem] font-black uppercase tracking-wider text-[#77736b]"
              >Available Routing Models (${modelsList.length})</span
            >
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${modelsList.map((m) => {
                return html`
                  <span
                    class="bg-[#faf9f6]/80 border border-[#e7e1d8]/60 text-[#2c2925] text-xs px-2.5 py-1 rounded-lg font-semibold transition-all hover:border-[#e7e1d8] hover:bg-[#faf9f6] select-none cursor-default shadow-2xs hover:shadow-xs"
                    title="${m.id}"
                  >
                    ${m.name}
                  </span>
                `;
              })}
            </div>
          </div>
        </div>
      `;
    });

    container.replaceChildren(html`
      <div
        class="bg-white/80 backdrop-blur-md rounded-2xl border border-[#e7e1d8] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300"
      >
        <div
          class="p-6 border-b border-[#e7e1d8]/60 bg-linear-to-r from-transparent via-[#fcfaf7] to-transparent"
        >
          <h1
            class="text-2xl font-extrabold tracking-tight bg-linear-to-r from-[#171717] via-[#2c2925] to-[#f97316] bg-clip-text text-transparent"
          >
            Active Routing Providers
          </h1>
          <p class="text-[#77736b] text-sm mt-1">
            Review active upstream accounts, connection health, and routing
            models.
          </p>
        </div>
        <div class="p-6 flex flex-col gap-y-5">${listHtml}</div>
      </div>
    `);
  }

  service.subscribe(() => render());
  render();
  return container;
}
